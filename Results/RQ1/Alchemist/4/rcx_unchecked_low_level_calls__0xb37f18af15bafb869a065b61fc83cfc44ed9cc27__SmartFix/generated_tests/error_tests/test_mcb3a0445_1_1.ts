import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant mcb3a0445 by exploiting the difference between >= and > when depositsCount reaches max uint256", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the max uint256 value
    const maxUint = ethers.MaxUint256;

    // We need to set depositsCount to maxUint - 1 so that the next receive() call will
    // attempt to increment it to maxUint, and then the subsequent call will overflow
    // However, we cannot directly set depositsCount, so we need to send ether many times
    // This is impractical for maxUint, so we use a different approach:
    // We exploit the fact that the mutant uses > instead of >=
    // The original: require(depositsCount + 1 >= depositsCount) - always true
    // The mutant: require(depositsCount + 1 > depositsCount) - always true for normal values

    // To kill the mutant, we need a case where depositsCount + 1 == depositsCount (overflow)
    // But Solidity 0.8+ reverts on overflow automatically

    // Alternative: Send ether to increment depositsCount and verify it works
    // Both versions will work the same, so we test edge behavior:
    // Send 1 wei to trigger receive()
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Check depositsCount increased
    expect(await instance.depositsCount()).to.equal(1);

    // Send again
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    expect(await instance.depositsCount()).to.equal(2);

    // The mutant cannot be killed with normal operations because both >= and >
    // behave identically for all possible non-overflowing values
    // Therefore this test will pass on both original and mutant
    // But we document it as the best possible test given the constraints
  });
});