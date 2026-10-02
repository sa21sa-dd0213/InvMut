import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection - _transfer address check", function () {
  it("should revert when transferring to address(0) but succeed when transferring to non-zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = ethers.parseEther("1000");
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TST");
    await instance.waitForDeployment();

    // Attempt transfer to non-zero address (should succeed on original, fail on mutant)
    const transferAmount = ethers.parseEther("100");
    const tx = instance.transfer(addr1.address, transferAmount);

    // The mutant changes require(_to != address(0)) to require(_to == address(0))
    // So a transfer to a non-zero address will revert on the mutant
    // A transfer to address(0) will succeed on the mutant (but should revert on original)
    await expect(tx).to.not.be.reverted;

    // Verify balance change on original (will fail on mutant since tx reverts)
    expect(await instance.balanceOf(addr1.address)).to.equal(transferAmount);
  });
});