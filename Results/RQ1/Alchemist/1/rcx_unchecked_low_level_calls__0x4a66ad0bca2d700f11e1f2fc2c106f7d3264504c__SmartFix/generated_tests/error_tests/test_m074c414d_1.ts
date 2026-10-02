import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m074c414d test", function () {
  it("should kill mutant by verifying loop executes for non-empty recipients array", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const recipientAddress = "0x0000000000000000000000000000000000000001";
    const recipients = [recipientAddress];
    const amounts = [1];

    // The original contract would execute the loop and call transferFrom on caddress.
    // The mutant with i > _tos.length will skip the loop entirely (i=0, _tos.length=1, 0 > 1 is false).
    // To detect the mutant, we check that the call was actually made (it should revert if caddress.call fails,
    // but we can also check state changes). Since caddress is a fixed address that may not accept the call,
    // we can check that the function returns true in both cases but the loop side effect differs.
    // The most reliable way: check that the function does not revert (since original would attempt the call,
    // mutant would skip and return true). The mutant would skip all calls and return true silently.
    // We can detect this by verifying that after calling transfer, the balance of from remains unchanged
    // if the mutant skipped, but original would attempt a call that might revert or not.
    // Since we cannot predict caddress behavior, we instead verify that the function does NOT revert
    // when called with valid parameters - mutant would always succeed, original would attempt call
    // (which may revert or not). The key is that mutant skips the loop, so if we can force a revert
    // condition in the original that the mutant avoids, we kill it.
    // However, the original loop condition requires v[i] to pass a math check. We'll use v[i]=1 (passes).
    // The original will attempt the external call which may fail, but we can test that the function
    // returns true. Both would return true. So we need a different approach: 
    // Actually, the simplest detection: the mutant never executes the loop, so the external call never happens.
    // If we set up a situation where the external call is expected to cause a state change (e.g., if caddress
    // were a contract that tracks calls), we could check. But caddress is fixed and we don't control it.
    // Instead, we can test that calling transfer with a non-empty array and checking the gas used differs
    // between original and mutant. But in a single test we can't compare gas.
    // Better: The original contract will execute the loop, which calls caddress.call. If that call reverts,
    // the whole transaction reverts. The mutant will skip the call and return true. So we can use a v[i] that
    // passes the check but the external call will revert (since caddress is a random EOA, calling transferFrom
    // on it will fail). So original would revert, mutant would not revert. This kills the mutant.
    await expect(
      instance.transfer(recipients, amounts)
    ).to.be.reverted; // original would revert due to failed external call; mutant would not revert -> test passes on original, fails on mutant
  });
});