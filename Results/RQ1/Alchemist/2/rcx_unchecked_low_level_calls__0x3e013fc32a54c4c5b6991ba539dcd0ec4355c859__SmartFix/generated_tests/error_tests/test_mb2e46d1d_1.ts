import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant mb2e46d1d (overflow protection removed)", function () {
  it("should revert when msg.value causes balance overflow in multiplicate, but mutant would not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some initial balance to the contract so it's non-zero
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Calculate a msg.value that when added to current balance causes uint256 overflow
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    // Overflow occurs if: contractBalance + msg.value < contractBalance
    // We'll use msg.value = type(uint256).max - contractBalance + 1
    const maxUint256 = ethers.MaxUint256;
    const overflowValue = maxUint256 - contractBalance + 1n;

    // This should revert in original due to require check, but not in mutant
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: overflowValue })
    ).to.be.reverted;
  });
});