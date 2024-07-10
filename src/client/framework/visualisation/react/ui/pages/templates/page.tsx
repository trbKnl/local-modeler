interface PageProps {
  body: JSX.Element
  footer?: JSX.Element
}

export const Page = (props: PageProps): JSX.Element => {

  const queryParams = new URLSearchParams(window.location.search);
  const participantId = queryParams.get('participantId');

  return (
    <div className='w-full h-full'>
      {participantId !== null ? (
        <>
          {props.body}
          {props.footer != null && (
            <div className='h-footer flex-shrink-0 mt-5'>{props.footer}</div>
          )}
        </>
      ) : (
        <p className='font-bold'>
           Error: participantId is missing from the query parameters, please provide one. For example: <a href="/?participantId=123" className="underline">/?participantId=&lt;123&gt;</a>
        </p>
      )}
    </div>
  );
}
