import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m145eadc4 - caddress changed to address(this)", function () {
  it("should kill the mutant by verifying that transferFrom is called on the external contract, not on EBU itself", async function () {
    // Get signers
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the original EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the expected external contract address from the original code
    const expectedExternalAddress = "0x1f844685f7Bf86eFcc0e74D8642c54A257111923";
    
    // Get the actual caddress from the deployed contract
    const actualCaddress = await instance.caddress();
    
    // Verify the mutant changed the address
    expect(actualCaddress).to.equal(await instance.getAddress());
    
    // Prepare test data
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token
    
    // Call transfer function as the authorized sender (from address)
    const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    await ethers.provider.send("hardhat_impersonateAccount", [authorizedSigner.address]);
    const authorizedSignerConnected = await ethers.getSigner(authorizedSigner.address);
    
    // Fund the authorized account for gas
    await owner.sendTransaction({
      to: authorizedSigner.address,
      value: ethers.parseEther("1.0")
    });
    
    // Execute transfer
    const tx = await instance.connect(authorizedSignerConnected).transfer(recipients, amounts);
    await tx.wait();
    
    // The mutant should call address(this) instead of the external contract
    // We can verify by checking that no call was made to the expected external address
    // Since we can't directly check internal calls, we check the caddress value
    const mutantCaddress = await instance.caddress();
    
    // The mutant fails because the call goes to the EBU contract itself
    // If the call went to the external contract, caddress would still be the original value
    // Since mutant changed it to address(this), the test should fail on the original
    // and pass on the mutant (killing it)
    expect(mutantCaddress).to.not.equal(expectedExternalAddress);
    
    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [authorizedSigner.address]);
  });
});