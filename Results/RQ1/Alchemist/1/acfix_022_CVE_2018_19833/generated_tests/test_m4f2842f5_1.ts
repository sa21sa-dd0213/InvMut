import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m4f2842f5 test", function () {
  it("should emit Transfer event when tokens are transferred", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = ethers.parseEther("1000");
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TST");
    await instance.waitForDeployment();

    // Perform a transfer and check for Transfer event emission
    const transferAmount = ethers.parseEther("100");
    const tx = await instance.transfer(addr1.address, transferAmount);
    const receipt = await tx.wait();

    // Verify the Transfer event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Transfer")
      .withArgs(owner.address, addr1.address, transferAmount);
  });
});