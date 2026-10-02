import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - kill mutant m4863ab4b", function () {
  it("should kill mutant by triggering arithmetic overflow boundary condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund contract with initial balance
    const initialBalance = ethers.parseEther("1");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialBalance
    });

    // Calculate msg.value to cause overflow: msg.value = 2^256 - currentBalance
    const currentBalance = await ethers.provider.getBalance(await instance.getAddress());
    const maxUint256 = ethers.MaxUint256;
    const overflowValue = maxUint256 - currentBalance + 1n; // +1 to make sum exactly 0 after overflow

    // Original: require((balance + msg.value) >= balance) passes when overflow wraps to 0
    // Mutant: require((balance + msg.value + 1) >= balance) fails because sum becomes 1
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: overflowValue })
    ).to.be.reverted;
  });
});