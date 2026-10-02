import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection test", function () {
  it("should kill mutant m454a07f5 by calling transfer from the hardcoded original address", async function () {
    // Get signers
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the hardcoded original 'from' address from the contract
    const originalFromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Impersonate the hardcoded original address using Hardhat's built-in feature
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [originalFromAddress],
    });
    
    const impersonatedSigner = await ethers.getSigner(originalFromAddress);
    
    // Fund the impersonated account with some ETH for gas
    await owner.sendTransaction({
      to: originalFromAddress,
      value: ethers.parseEther("1.0"),
    });
    
    // Prepare test data
    const tos = [addr1.address];
    const values = [ethers.parseEther("1")];
    
    // Call transfer from the hardcoded original address
    const tx = await instance.connect(impersonatedSigner).transfer(tos, values);
    await tx.wait();
    
    // If we reach here, the transaction succeeded (original behavior)
    // In the mutant, this would revert because msg.sender != address(this)
    // Therefore, this test passes on original but fails on mutant
    expect(true).to.be.true;
  });
});