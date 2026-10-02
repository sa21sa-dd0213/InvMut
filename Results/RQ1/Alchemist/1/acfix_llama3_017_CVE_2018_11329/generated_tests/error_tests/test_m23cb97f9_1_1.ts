import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m23cb97f9 - getFreeKilo", function () {
  it("should revert when calling getFreeKilo from an address with zero kilos (mutant requires non-zero)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, seed the market to initialize the contract
    await instance.seedMarket(1000, { value: ethers.parseEther("1") });

    // Verify addr1 has zero kilos initially
    expect(await instance.connect(addr1).getMyKilo()).to.equal(0);

    // Call getFreeKilo from addr1 - this should succeed on original (kilos==0)
    // but revert on mutant because mutant requires kilos!=0
    await expect(
      instance.connect(addr1).getFreeKilo()
    ).to.be.reverted;
  });

  it("should succeed when calling getFreeKilo from an address that already has kilos (mutant condition)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contract
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed market to initialize
    await instance.seedMarket(1000, { value: ethers.parseEther("1") });

    // First, give addr1 some kilos via getFreeKilo (original behavior)
    await instance.connect(addr1).getFreeKilo();

    // Now addr1 has kilos > 0
    expect(await instance.connect(addr1).getMyKilo()).to.be.gt(0);

    // Try calling getFreeKilo again - should revert on original (kilos!=0)
    // but succeed on mutant (kilos!=0)
    await expect(
      instance.connect(addr1).getFreeKilo()
    ).to.not.be.reverted;
  });
});