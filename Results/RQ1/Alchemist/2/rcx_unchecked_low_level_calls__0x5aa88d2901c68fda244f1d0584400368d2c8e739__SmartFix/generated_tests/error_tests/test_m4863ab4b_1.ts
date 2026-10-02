import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test", function () {
  it("should kill mutant m4863ab4b by triggering overflow revert when balance is max-1 and msg.value is 1", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set contract balance to type(uint256).max - 1
    const maxUint = ethers.MaxUint256;
    const targetBalance = maxUint - 1n;
    
    // Fund the contract with the target balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: targetBalance
    });

    // Verify initial balance
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(targetBalance);

    // Now call multiplicate with msg.value = 1
    // Original: require((targetBalance + 1) >= targetBalance) => maxUint >= targetBalance => true
    // Mutant: require((targetBalance + 1 + 1) >= targetBalance) => (maxUint + 1n) wraps to 0 >= targetBalance => false -> revert
    await expect(
      instance.connect(owner).multiplicate(owner.address, { value: 1n })
    ).to.be.reverted;
  });
});