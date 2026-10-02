import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection - reentrancy attack", function () {
  it("should detect missing nonReentrant modifier by performing a reentrancy attack", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the vulnerable Reentrance contract (mutant has no nonReentrant)
    const ReentranceFactory = await ethers.getContractFactory("Reentrance");
    const reentrance = await ReentranceFactory.deploy();
    await reentrance.waitForDeployment();

    // Deploy the attacker contract
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await reentrance.getAddress());
    await attackerContract.waitForDeployment();

    // Fund the attacker contract with initial ETH (e.g., 1 ETH)
    const depositAmount = ethers.parseEther("1");
    await owner.sendTransaction({
      to: await attackerContract.getAddress(),
      value: depositAmount
    });

    // Attacker contract calls addToBalance() to set its balance in Reentrance
    await attackerContract.connect(attacker).deposit({ value: depositAmount });

    // Verify attacker contract has balance in Reentrance
    const balanceBefore = await reentrance.getBalance(await attackerContract.getAddress());
    expect(balanceBefore).to.equal(depositAmount);

    // Perform the reentrancy attack
    await expect(
      attackerContract.connect(attacker).attack()
    ).to.be.reverted; // Original would revert, mutant would not (drains contract)

    // If mutant is live (no reentrancy protection), the attack would succeed
    // and drain the contract - we check if contract ETH balance is 0
    const contractBalance = await ethers.provider.getBalance(await reentrance.getAddress());
    expect(contractBalance).to.equal(0); // Mutant would fail this assertion
  });
});