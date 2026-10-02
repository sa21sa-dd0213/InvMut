import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - migrateTo without authorization check", function () {
  it("should revert when non-creator calls migrateTo on original contract", async function () {
    const [creator, attacker] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first
    const depositTx = await instance.connect(creator).deposit({ value: ethers.parseEther("10") });
    await depositTx.wait();

    // Attempt to call migrateTo from unauthorized address (attacker)
    // On original contract, this should revert because require(creator == msg.sender) fails
    await expect(
      instance.connect(attacker).migrateTo(attacker.address)
    ).to.be.reverted;
  });
});