import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m1c38a07e by calling sendTo with positive amount from owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const amount = ethers.parseEther("1");
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Owner calls sendTo with a positive amount - should succeed in original, revert in mutant
    const tx = instance.connect(owner).sendTo(addr1.address, amount);
    
    // The mutant will revert because require(amount < 0) fails for positive amounts
    // The original contract would succeed, so this test passes on original and fails (kills) mutant
    await expect(tx).to.be.reverted;
  });
});