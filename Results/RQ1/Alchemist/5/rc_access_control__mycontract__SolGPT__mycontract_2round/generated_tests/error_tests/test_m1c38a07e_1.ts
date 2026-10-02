import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract - kill mutant m1c38a07e", function () {
  it("should succeed when owner sends a positive amount, but mutant would revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const amount = ethers.parseEther("1");
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    await expect(
      instance.connect(owner).sendTo(addr1.address, amount)
    ).to.not.be.reverted;

    const finalBalance = await ethers.provider.getBalance(addr1.address);
    expect(finalBalance - initialBalance).to.equal(amount);
  });
});