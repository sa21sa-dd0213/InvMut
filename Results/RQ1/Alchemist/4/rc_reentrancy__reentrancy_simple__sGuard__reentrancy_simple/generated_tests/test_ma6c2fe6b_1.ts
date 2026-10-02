import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant ma6c2fe6b test", function () {
  it("should kill the mutant by showing that a successful withdrawal does not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner deposits 1 ETH into the contract for addr1
    const depositAmount = ethers.parseEther("1.0");
    const addToBalanceTx = await instance.connect(owner).addToBalance({ value: depositAmount });
    await addToBalanceTx.wait();

    // Verify addr1 has the balance
    expect(await instance.getBalance(owner.address)).to.equal(depositAmount);

    // Owner withdraws the full balance - this should succeed on original but revert on mutant
    const withdrawTx = instance.connect(owner).withdrawBalance();

    // On original: withdrawal succeeds, balance becomes 0
    // On mutant: the call succeeds but the unconditional revert causes the whole tx to revert
    await expect(withdrawTx).to.not.be.reverted;

    // Verify the balance was cleared (will pass on original, fail on mutant)
    expect(await instance.getBalance(owner.address)).to.equal(0);
  });
});