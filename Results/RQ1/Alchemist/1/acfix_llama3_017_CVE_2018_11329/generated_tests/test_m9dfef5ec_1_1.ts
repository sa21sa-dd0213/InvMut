import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m9dfef5ec test", function () {
  it("should detect mutant that replaces block.timestamp with block.prevrandao in getFreeKilo", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First seed the market to initialize the contract
    await instance.connect(owner).seedMarket(100, { value: ethers.parseEther("1") });

    // Call getFreeKilo to set lastCollect[addr1]
    // In original: lastCollect = block.timestamp
    // In mutant: lastCollect = block.prevrandao
    await instance.connect(addr1).getFreeKilo();

    // Immediately call getMyDrugs() which calls getDrugsSinceLastCollect()
    // getDrugsSinceLastCollect computes: block.timestamp - lastCollect[adr]
    // In original: block.timestamp - block.timestamp = 0 → returns 0
    // In mutant: block.timestamp - block.prevrandao → will underflow (revert) because prevrandao >> timestamp
    await expect(instance.connect(addr1).getMyDrugs()).to.be.reverted;
  });
});