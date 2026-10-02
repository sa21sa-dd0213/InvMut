import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m5f60149f", function () {
  it("should detect mutant that changes from address by checking token transfer source", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the original from address that should be in the original contract
    const originalFromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Get the contract's from address
    const contractFromAddress = await instance.from();
    
    // Verify the from address matches the original
    expect(contractFromAddress.toLowerCase()).to.equal(originalFromAddress.toLowerCase());
    
    // Create test parameters
    const recipients = [addr1.address];
    const amounts = [ethers.parseEther("1")];
    
    // Call transfer as the authorized sender (the original from address)
    // We need to impersonate the original from address since it's the msg.sender requirement
    await ethers.provider.send("hardhat_impersonateAccount", [originalFromAddress]);
    const signer = await ethers.getSigner(originalFromAddress);
    
    // Fund the impersonated account with some ETH for gas
    await owner.sendTransaction({
      to: originalFromAddress,
      value: ethers.parseEther("1")
    });
    
    // Execute the transfer
    const tx = await instance.connect(signer).transfer(recipients, amounts);
    await tx.wait();
    
    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [originalFromAddress]);
    
    // The test should pass on original (from address is correct) 
    // and fail on mutant (from address is different, causing wrong transfer source)
  });
});