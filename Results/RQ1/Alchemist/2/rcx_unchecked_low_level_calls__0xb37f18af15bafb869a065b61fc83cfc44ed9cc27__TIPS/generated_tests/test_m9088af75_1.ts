import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner tries to withdraw funds", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there is something to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner tries to withdraw - should revert with onlyOwner modifier
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});