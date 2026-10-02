import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection test", function () {
  it("should detect mutant mbf21c7a0 by adding balance when user already has funds", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit: give addr1 some initial balance
    const initialDeposit = ethers.parseEther("1.0");
    await instance.connect(addr1).addToBalance({ value: initialDeposit });
    
    // Now try to add more funds - should succeed on original, revert on mutant
    const secondDeposit = ethers.parseEther("0.5");
    
    // On original: require((1.0 + 0.5) >= 1.0) passes (1.5 >= 1.0)
    // On mutant: require((1.0 + 0.5) == 1.0) fails (1.5 != 1.0) -> reverts
    await expect(
      instance.connect(addr1).addToBalance({ value: secondDeposit })
    ).to.not.be.reverted;
    
    // Verify balance increased correctly
    const finalBalance = await instance.getBalance(addr1.address);
    expect(finalBalance).to.equal(ethers.parseEther("1.5"));
  });
});