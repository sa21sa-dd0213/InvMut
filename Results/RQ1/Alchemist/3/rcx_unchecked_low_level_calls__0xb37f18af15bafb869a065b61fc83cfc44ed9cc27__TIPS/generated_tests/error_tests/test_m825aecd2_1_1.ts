import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test - withdrawAll without onlyOwner", function () {
  it("should revert when non-owner calls withdrawAll on original contract, but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for SimpleWallet)
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ETH
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });
    
    // Verify contract has balance
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(fundAmount);
    
    // Attempt to call withdrawAll from a non-owner address
    // This should revert on the original (with modifier) but succeed on mutant (without modifier)
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.revertedWith(""); // Empty string catches any revert reason
    
    // Additional check: contract balance should remain unchanged if reverted
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(fundAmount);
  });
});