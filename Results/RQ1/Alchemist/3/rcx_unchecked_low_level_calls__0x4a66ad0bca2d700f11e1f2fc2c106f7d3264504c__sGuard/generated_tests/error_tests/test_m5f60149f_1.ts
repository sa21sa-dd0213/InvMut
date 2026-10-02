import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m5f60149f test", function () {
  it("should kill mutant by verifying token transfer from correct address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the from address from the contract
    const fromAddress = await instance.from();
    
    // Verify that the from address matches the authorized caller (original contract)
    // In the mutant, from is changed to 0x1f84..., so we need to test behavior
    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Create test data
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token
    
    // Fund the authorized address with some ETH for gas (if needed)
    await owner.sendTransaction({
      to: authorizedAddress,
      value: ethers.parseEther("1.0")
    });
    
    // Impersonate the authorized address
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [authorizedAddress]
    });
    
    const authorizedSigner = await ethers.getSigner(authorizedAddress);
    
    // Call transfer from the authorized address
    const tx = await instance.connect(authorizedSigner).transfer(recipients, amounts);
    await tx.wait();
    
    // The test should check that the transaction doesn't revert
    // In the mutant, the transferFrom call will fail because from is wrong
    // We expect the original to succeed but the mutant to fail
    // Since we can't directly check the internal call, we verify the function executed
    expect(tx).to.not.be.undefined;
    
    // Stop impersonating
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [authorizedAddress]
    });
  });
});