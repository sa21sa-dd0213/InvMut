import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m9b0c6304 test", function () {
  it("should detect removal of nonReentrant modifier from addToBalance via reentrancy", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for Reentrance)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Attacker deploys a malicious contract to perform reentrancy
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(contractAddress);
    await attackerContract.waitForDeployment();

    // Fund the attacker contract with some ETH via addToBalance
    const depositAmount = ethers.parseEther("1.0");
    await attackerContract.connect(attacker).deposit({ value: depositAmount });

    // Check initial balance of attacker contract in Reentrance
    expect(await instance.getBalance(await attackerContract.getAddress())).to.equal(depositAmount);

    // Trigger the attack - this should call withdrawBalance which re-enters addToBalance
    // In the original contract with nonReentrant, this would revert
    // In the mutant without nonReentrant, it might succeed and drain the contract
    const tx = attackerContract.connect(attacker).attack();

    // The test expects the original behavior: the transaction should revert
    // due to the reentrancy guard that is missing in the mutant
    await expect(tx).to.be.reverted;

    // If we reach here, the mutant is killed because the test passed on original
    // but would fail on mutant (mutant would not revert)
  });
});