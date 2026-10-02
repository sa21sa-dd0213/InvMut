import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant mb2e46d1d", function () {
  it("should revert when overflow would occur in multiplicate, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether to set initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Calculate a value that, when added to current balance, would overflow
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const overflowValue = ethers.MaxUint256 - contractBalance + BigInt(1);

    // This should revert in the original due to overflow protection
    // but will succeed in the mutant (killing it)
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: overflowValue })
    ).to.not.be.reverted;
  });
});