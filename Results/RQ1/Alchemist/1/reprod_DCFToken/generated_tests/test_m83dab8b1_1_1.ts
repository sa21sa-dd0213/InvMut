import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when distributeTokenPeriodic is called before distributeAddress is set", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const liquidityReceiveAddress = addr1.address;

    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // First, set the caller (cfo) to be able to call setDistributeAddress later
    await instance.connect(owner).setCaller(addr2.address);

    // Do NOT set distributeAddress - keep it as address(0)
    // Attempt to call distributeTokenPeriodic which should revert because distributeAddress is not set
    await expect(
      instance.connect(owner).distributeTokenPeriodic()
    ).to.be.revertedWith("distribute address is not set");
  });
});