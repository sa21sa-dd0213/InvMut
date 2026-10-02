import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test - getDrugsSinceLastCollect return removal", function () {
  it("should detect that getDrugsSinceLastCollect returns 0 instead of computed value when return keyword is removed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    await instance.seedMarket(1000, { value: ethers.parseEther("1") });

    // Give addr1 some kilos via getFreeKilo
    await instance.connect(addr1).getFreeKilo();

    // Wait some time so that secondsPassed > 0
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);

    // Call getDrugsSinceLastCollect for addr1
    const drugsSinceLastCollect = await instance.connect(addr1).getDrugsSinceLastCollect(addr1.address);

    // The original contract would return secondsPassed * Kilos[addr1] (100 * 300 = 30000)
    // The mutant returns 0 because the return statement was removed
    // We expect a non-zero value, which will fail on the mutant
    expect(drugsSinceLastCollect).to.be.gt(0);
  });
});