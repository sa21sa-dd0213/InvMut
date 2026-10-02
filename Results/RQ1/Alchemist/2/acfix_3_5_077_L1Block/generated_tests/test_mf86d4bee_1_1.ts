import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection", function () {
  it("should detect mutant mf86d4bee by verifying parent constructor initialization", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const version = await instance.version();
    expect(version).to.equal("1.0.0");

    const DEPOSITOR_ACCOUNT = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";
    await expect(
      instance.connect(await ethers.getSigner(DEPOSITOR_ACCOUNT)).setL1BlockValues(
        1,
        2,
        ethers.parseEther("1"),
        ethers.formatBytes32String("test"),
        3,
        ethers.formatBytes32String("batch"),
        100,
        200
      )
    ).to.not.be.reverted;

    const storageValue = await ethers.provider.getStorage(await instance.getAddress(), 0);
    expect(storageValue).to.equal("0x0000000000000000000000000000000000000000000000000000000000000001");
  });
});