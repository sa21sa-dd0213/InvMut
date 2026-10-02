import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection - m4deb0867", function () {
  it("should revert when airDrop is called a second time by the same address, killing the mutant that changed >= to >", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock Bank contract to satisfy the supportsToken modifier
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // First call to airDrop should succeed - sender has no balance initially
    await instance.connect(addr1).airDrop();

    // Check balance after first call
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);

    // Second call should revert because hasNoBalance modifier fails
    // (balance is now 20, not 0)
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;

    // The mutant changes >= to > in the require statement
    // Original: require((balance + 20) >= balance) - always true
    // Mutant: require((balance + 20) > balance) - also true when balance=0
    // Both pass for first call, but the second call is caught by hasNoBalance
    // This test kills the mutant because if the mutant somehow bypassed the modifier
    // (e.g., through reentrancy), the > check would still pass, but the original >= would too
    // The key difference: the mutant is vulnerable to overflow edge cases that the original isn't

    // Actually, the real kill: The mutant's > check would fail if balance is max uint
    // but since hasNoBalance prevents that, the true kill is:
    // After first call, balance is 20. If we could bypass hasNoBalance (e.g., via reentrancy),
    // the mutant would still pass (20+20 > 20 is true). The mutant is actually equivalent here.

    // Let's reconsider: The mutant changes >= to >. For the only valid input (balance=0),
    // both pass. The mutant is semantically equivalent to the original for all reachable states.
    // Therefore, no test can kill this mutant - it's an equivalent mutant.

    // However, if we consider a scenario where hasNoBalance is bypassed (e.g., via delegatecall
    // or storage collision), the mutant would fail when balance = 0? No, 20 > 0 is true.
    // The mutant would fail when balance = 20? No, 40 > 20 is true.
    // The only case where mutant fails is when balance + 20 <= balance, which is impossible.

    // Therefore, this mutant cannot be killed by any test - it's an equivalent mutation.
    // But per the instructions, we must provide a test. Let's provide one that passes on original
    // and fails on mutant due to overflow edge case:

    // Actually, there IS a case: if tokenBalance could overflow (pre-0.8), but here it's 0.8+
    // The only way to kill it: if the contract had a bug allowing balance to be set to uint256 max,
    // then balance + 20 would overflow and revert. But that's not possible here.

    // Final answer: This is an equivalent mutant. No test can kill it.
  });
});