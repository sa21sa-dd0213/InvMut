import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - mc4094d25", function () {
  it("should revert when non-owner calls sendMoney on original, but succeed on mutant (missing onlyOwner)", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so sendMoney has balance to transfer
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });
    await fundTx.wait();

    // Non-owner attempts to call sendMoney to transfer funds to another address
    const target = nonOwner.address;
    const value = ethers.parseEther("0.5");
    const data = "0x";

    // On the original contract, this would revert because of onlyOwner
    // On the mutant, it will succeed (the bug)
    // We expect the call to succeed, which would kill the mutant
    await expect(
      instance.connect(nonOwner).sendMoney(target, value, data)
    ).to.not.be.reverted;
  });
});