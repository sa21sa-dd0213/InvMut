import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant md9cf97de test", function () {
  it("should revert on second call to getFreeKilo when user already has kilos", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    await instance.connect(owner).seedMarket(1000, { value: ethers.parseEther("1") });

    // First call to getFreeKilo should succeed
    await instance.connect(addr1).getFreeKilo();

    // Second call to getFreeKilo should revert because Kilos[addr1] is no longer 0
    await expect(instance.connect(addr1).getFreeKilo()).to.be.reverted;
  });
});