import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m195765ab by burning less than full balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TT");
    await instance.waitForDeployment();

    // Owner has full supply, burn only 100 tokens (less than full balance)
    const burnAmount = 100;
    const ownerBalanceBefore = await instance.balanceOf(owner.address);
    expect(ownerBalanceBefore).to.equal(ethers.parseEther("1000"));

    // This should succeed on original (>=) but revert on mutant (==)
    await expect(instance.burn(burnAmount)).to.not.be.reverted;

    // Verify the burn actually happened (original behavior)
    const ownerBalanceAfter = await instance.balanceOf(owner.address);
    expect(ownerBalanceAfter).to.equal(ethers.parseEther("900"));
  });
});