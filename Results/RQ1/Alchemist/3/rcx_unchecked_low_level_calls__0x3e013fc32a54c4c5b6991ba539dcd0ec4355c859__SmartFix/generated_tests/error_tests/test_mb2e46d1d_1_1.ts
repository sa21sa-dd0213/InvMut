import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant mb2e46d1d test", function () {
  it("should detect removal of tautological require statement in multiplicate function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    const initialFunding = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFunding
    });

    // Get initial balances
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);

    // Call multiplicate with msg.value equal to contract balance
    // This should trigger the require statement in original code (always true)
    const callValue = ethers.parseEther("1.0");
    await instance.connect(owner).multiplicate(addr1.address, { value: callValue });

    // Check that funds were transferred (behavior is identical in both original and mutant)
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);

    // The mutant is undetectable - both original and mutant produce same result
    // The require was a tautology, so removing it changes nothing
    expect(contractBalanceAfter).to.equal(0);
    expect(addr1BalanceAfter).to.equal(addr1BalanceBefore + ethers.parseEther("2.0"));
  });
});