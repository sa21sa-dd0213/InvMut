import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when tos array is empty (kills mutant that removes require(tos.length > 0))", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Owner approves the AirDropContract to transfer tokens
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Empty tos array, but non-empty vs array (length mismatch will trigger other require first, 
    // so we use matching empty vs array to isolate the empty tos check)
    // Actually, to test the exact mutant, we need tos.length == vs.length and both empty
    const emptyTos: string[] = [];
    const emptyVs: bigint[] = [];
    
    // This should revert in original due to require(tos.length > 0)
    // but would succeed (return true without looping) in the mutant
    await expect(
      instance.transfer(await token.getAddress(), emptyTos, emptyVs)
    ).to.be.reverted;
  });
});