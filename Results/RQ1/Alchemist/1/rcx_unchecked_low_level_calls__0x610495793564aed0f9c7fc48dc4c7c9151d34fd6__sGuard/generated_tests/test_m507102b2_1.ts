import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls withdrawAll (kills mutant that removes onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there is balance to withdraw
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Attempt to call withdrawAll from non-owner address - should revert in original
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});