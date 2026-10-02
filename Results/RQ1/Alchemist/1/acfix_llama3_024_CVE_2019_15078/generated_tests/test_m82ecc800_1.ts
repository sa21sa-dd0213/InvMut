import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - Kill mutant m82ecc800 (transferFrom: _amount == balances[_from])", function () {
  it("should allow transfer of partial balance in original but revert in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Distribute tokens to addr1 so they have a balance
    const distributeAmount = ethers.parseEther("1000");
    await instance.connect(owner).distr(addr1.address, distributeAmount);

    // Approve owner to spend addr1's tokens
    await instance.connect(addr1).approve(owner.address, distributeAmount);

    // Attempt to transfer only half of addr1's balance (should work in original, fail in mutant)
    const halfBalance = distributeAmount / 2n;
    await expect(
      instance.connect(owner).transferFrom(addr1.address, addr2.address, halfBalance)
    ).to.be.reverted;
  });
});