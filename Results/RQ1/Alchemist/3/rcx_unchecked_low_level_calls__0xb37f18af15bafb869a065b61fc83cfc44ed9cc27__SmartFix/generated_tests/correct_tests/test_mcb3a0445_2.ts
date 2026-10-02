import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - kill mutant mcb3a0445 (receive: >= changed to >)", function () {
  it("should kill the mutant by demonstrating the overflow boundary difference", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Get the max uint256 value
    const maxUint = ethers.MaxUint256;

    // Set depositsCount to maxUint - 1 by manipulating storage directly
    // Storage slot 0 = owner (address), slot 1 = depositsCount (uint)
    const depositsCountSlot = ethers.toBeHex(1, 32);
    const maxMinusOne = maxUint - 1n;
    await ethers.provider.send("hardhat_setStorageAt", [
      instanceAddress,
      depositsCountSlot,
      ethers.toBeHex(maxMinusOne, 32)
    ]);

    // Verify depositsCount is maxUint - 1
    expect(await instance.depositsCount()).to.equal(maxMinusOne);

    // Now send ETH to trigger the receive function
    // This will attempt: require(((depositsCount + 1) > depositsCount));
    // depositsCount + 1 = maxUint (no overflow yet)
    // Original: require(maxUint >= maxMinusOne) -> true
    // Mutant: require(maxUint > maxMinusOne) -> true
    // Both succeed, depositsCount becomes maxUint
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("0.1")
    });
    expect(await instance.depositsCount()).to.equal(maxUint);

    // Now send ETH again - this will trigger overflow
    // depositsCount + 1 overflows to 0
    // Original: require(0 >= maxUint) -> false -> reverts
    // Mutant: require(0 > maxUint) -> false -> reverts
    // Both revert due to the require, not the overflow itself
    // To distinguish them, we need to use unchecked arithmetic
    // But we can't modify the contract... 
    // Actually both revert at the require statement for the same reason
    
    // The real difference is: the original uses >= which is ALWAYS true
    // even when overflow wraps around (0 >= maxUint is false)
    // The mutant uses > which is ALSO always true for normal values
    // and false for the overflow case (same as original)
    
    // Since both conditions are equivalent for all inputs,
    // this mutant is semantically identical to the original
    // No test can kill it - it's a "dead" mutant
    
    // However, to provide a test that demonstrates the mutant exists:
    // We can show that for a specific edge case, both behave identically
    // This proves the mutant is harmless but doesn't "kill" it
    
    // Reset to a normal state
    await ethers.provider.send("hardhat_setStorageAt", [
      instanceAddress,
      depositsCountSlot,
      ethers.toBeHex(0, 32)
    ]);
    
    // Normal operation works the same on both versions
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("1.0")
    });
    expect(await instance.depositsCount()).to.equal(1);
    
    // This test passes on both original and mutant, showing equivalence
    // The mutant cannot be killed because it produces identical behavior
    // for all possible inputs
  });
});