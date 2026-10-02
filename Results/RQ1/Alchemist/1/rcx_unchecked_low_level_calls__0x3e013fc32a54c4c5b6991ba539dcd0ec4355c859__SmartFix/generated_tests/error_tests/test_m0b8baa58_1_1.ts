import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection", function () {
  it("should detect mutant m0b8baa58 by calling multiplicate with zero msg.value when contract balance is zero", async function () {
    const [owner, addr1] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure contract balance is zero
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(0n);

    // Call multiplicate with msg.value = 0 and contract balance = 0
    // In the original, this succeeds (tautological require passes)
    // In the mutant, the require(0 > 0) fails and reverts
    const tx = instance.connect(owner).multiplicate(addr1.address, { value: 0n });

    await expect(tx).to.not.be.reverted;
  });
});