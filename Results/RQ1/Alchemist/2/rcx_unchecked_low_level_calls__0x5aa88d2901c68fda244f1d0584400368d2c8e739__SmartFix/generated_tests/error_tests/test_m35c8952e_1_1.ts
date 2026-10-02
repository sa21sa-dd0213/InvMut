import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant m35c8952e test", function () {
  it("should revert when trying to send more than contract balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 1 ether from owner
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Get contract balance before calling multiplicate
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // This should revert in mutant because it tries to send 1 wei more than available
    await expect(
      instance.connect(owner).multiplicate(addr1.address, {
        value: contractBalanceBefore
      })
    ).to.be.reverted;

    // Verify addr1 balance didn't change
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    expect(finalBalance).to.equal(initialBalance);
  });
});