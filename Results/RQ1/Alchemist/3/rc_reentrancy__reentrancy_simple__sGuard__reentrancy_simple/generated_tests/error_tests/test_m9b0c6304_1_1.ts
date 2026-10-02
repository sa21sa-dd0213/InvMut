import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection - m9b0c6304", function () {
  it("should detect missing nonReentrant modifier on addToBalance by exploiting reentrancy", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for Reentrance)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the attacker with some ETH for the attack
    const initialDeposit = ethers.parseEther("1.0");

    // Attacker deposits ETH into the contract
    await instance.connect(attacker).addToBalance({ value: initialDeposit });

    // Verify attacker's balance
    expect(await instance.getBalance(attacker.address)).to.equal(initialDeposit);

    // Create a malicious contract to perform the reentrancy attack
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrancy");
    const malicious = await MaliciousFactory.deploy(await instance.getAddress());
    await malicious.waitForDeployment();

    // Fund the malicious contract with ETH
    await malicious.connect(owner).deposit({ value: ethers.parseEther("0.5") });

    // Trigger the attack - this should succeed on the mutant (missing reentrancy guard)
    // but fail on the original contract (with reentrancy guard)
    await malicious.connect(owner).attack({ value: ethers.parseEther("0.5") });

    // In the mutant, the attack succeeds and drains funds
    // In the original, this would revert due to nonReentrant modifier
    // Since we're testing the mutant, we expect the attack to succeed
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.be.lt(initialDeposit);
  });
});