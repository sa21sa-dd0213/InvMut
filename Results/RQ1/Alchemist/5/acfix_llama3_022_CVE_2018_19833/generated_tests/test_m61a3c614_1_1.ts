import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant test - Transfer event emission", function () {
  it("should emit Transfer event on successful transfer", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = ethers.parseEther("100");
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TT");
    await instance.waitForDeployment();

    const transferAmount = ethers.parseEther("10");
    const tx = await instance.transfer(addr1.address, transferAmount);
    const receipt = await tx.wait();

    // Expect Transfer event to be emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Transfer")
      .withArgs(owner.address, addr1.address, transferAmount);
  });
});