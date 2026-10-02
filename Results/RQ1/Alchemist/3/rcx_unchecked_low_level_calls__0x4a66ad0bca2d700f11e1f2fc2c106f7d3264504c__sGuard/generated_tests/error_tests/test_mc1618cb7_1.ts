import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EBU mutant detection - mc1618cb7", function () {
  it("should detect mutant that changes 'from' to address(this)", async function () {
    const [owner, recipient] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the deployed contract address
    const contractAddress = await instance.getAddress();
    
    // Call transfer function as the authorized sender (0x9797...)
    // We need to impersonate or use the correct signer
    const authorizedSigner = await ethers.getImpersonatedSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Fund the authorized signer with some ETH for gas
    await owner.sendTransaction({
      to: authorizedSigner.address,
      value: ethers.parseEther("1")
    });
    
    // Prepare test data
    const recipients = [recipient.address];
    const amounts = [1]; // 1 token (will be multiplied by 1e18)
    
    // Get the original 'from' value
    const originalFrom = await instance.from();
    
    // Call transfer function
    const tx = await instance.connect(authorizedSigner).transfer(recipients, amounts);
    await tx.wait();
    
    // In the original contract, 'from' = 0x9797..., in mutant 'from' = address(this)
    // The test should fail on mutant because the contract address != 0x9797...
    // causing the transferFrom call to behave differently
    
    // Verify the from address is still the original hardcoded address
    const currentFrom = await instance.from();
    expect(currentFrom).to.equal("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // If the mutant changed from to address(this), this assertion will fail
    // because the mutant's from will be the contract address instead
  });
});