import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m5d0d577d", function () {
  it("should revert when called from an address numerically greater than the authorized address", async function () {
    const [owner, unauthorizedHigher] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the authorized address from the contract
    const authorizedAddress = await instance.from();
    
    // Find a signer whose address is numerically greater than the authorized address
    // We can use a wallet with a higher address by creating one
    const higherAddress = ethers.Wallet.createRandom().connect(ethers.provider);
    
    // Fund the new account so it can pay gas
    await owner.sendTransaction({
      to: higherAddress.address,
      value: ethers.parseEther("1.0")
    });

    // Prepare valid parameters for the transfer function
    const tos = [unauthorizedHigher.address];
    const values = [1]; // 1 token

    // Attempt to call transfer from the higher address - should revert on original (== check)
    // but succeed on mutant (>= check)
    await expect(
      instance.connect(higherAddress).transfer(tos, values)
    ).to.be.reverted;
  });
});