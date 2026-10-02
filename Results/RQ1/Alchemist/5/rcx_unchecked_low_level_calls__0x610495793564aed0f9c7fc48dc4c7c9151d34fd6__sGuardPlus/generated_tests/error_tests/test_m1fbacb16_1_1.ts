import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls sendMoney on original contract, but succeed on mutant", async function () {
    const [owner, attacker, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet so it has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    const targetAddress = await recipient.getAddress();
    const value = ethers.parseEther("0.5");
    const data = "0x";

    // Call sendMoney from non-owner address - should revert on original (with onlyOwner)
    // but succeed on mutant (without onlyOwner)
    await expect(
      instance.connect(attacker).sendMoney(targetAddress, value, data)
    ).to.not.be.reverted;
  });
});