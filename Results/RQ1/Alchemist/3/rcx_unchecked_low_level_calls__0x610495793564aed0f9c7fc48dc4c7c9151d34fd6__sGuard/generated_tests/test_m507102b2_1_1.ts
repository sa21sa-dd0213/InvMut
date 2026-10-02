import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m507102b2 - onlyOwner modifier removed from withdrawAll", function () {
  it("should revert when non-owner calls withdrawAll on original, but succeeds on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for SimpleWallet)
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ether
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });
    
    // Verify contract has balance
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(fundAmount);
    
    // Attempt to call withdrawAll from non-owner address
    // On original contract this would revert (onlyOwner modifier)
    // On mutant this should succeed and drain funds to addr1
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.not.be.reverted;
    
    // Verify funds were transferred to addr1 (mutant behavior)
    // This assertion will fail on original (revert before transfer), passing on mutant
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(0);
    expect(await ethers.provider.getBalance(addr1.address)).to.equal(fundAmount);
  });
});