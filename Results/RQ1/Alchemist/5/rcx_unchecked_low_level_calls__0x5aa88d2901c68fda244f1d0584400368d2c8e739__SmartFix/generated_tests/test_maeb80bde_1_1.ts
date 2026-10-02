import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant maeb80bde test", function () {
  it("should detect the subtraction mutation in multiplicate function", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send initial balance to the contract so it has some funds
    const initialBalance = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialBalance
    });

    // Verify initial balance
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(initialBalance);

    // Call multiplicate with a non-zero value that should work in original but fail in mutant
    const attackValue = ethers.parseEther("1");

    // In original: require((10 + 1) >= 10) => true, function proceeds
    // In mutant: require((10 - 1) >= 10) => false, reverts
    await expect(
      instance.connect(attacker).multiplicate(attacker.address, { value: attackValue })
    ).to.be.reverted;
  });
});