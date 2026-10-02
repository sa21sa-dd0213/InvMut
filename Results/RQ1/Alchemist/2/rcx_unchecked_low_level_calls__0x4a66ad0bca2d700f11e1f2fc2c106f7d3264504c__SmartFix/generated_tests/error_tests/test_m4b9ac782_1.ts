import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m4b9ac782 detection", function () {
  it("should revert when called from the authorized address (mutant expects != instead of ==)", async function () {
    // Get signers
    const [owner] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // The authorized address is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate this address or use a signer with that private key
    // For testing purposes, we can use hardhat_impersonateAccount to simulate this address
    await ethers.provider.send("hardhat_impersonateAccount", [
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"
    ]);
    
    const authorizedSigner = await ethers.getSigner(
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"
    );
    
    // Fund the authorized address with some ETH for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0")
    });
    
    // Prepare valid inputs (any non-empty arrays will work for the test)
    const recipients = ["0x0000000000000000000000000000000000000001"];
    const amounts = [1]; // Non-zero value that passes the multiplication check
    
    // Call transfer from the authorized address
    // Original: should succeed (msg.sender == authorized address)
    // Mutant: should revert (msg.sender != authorized address fails because they ARE equal)
    const tx = instance.connect(authorizedSigner).transfer(recipients, amounts);
    
    // In the original contract this would succeed, in the mutant it should revert
    await expect(tx).to.be.reverted;
  });
});