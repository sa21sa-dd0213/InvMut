import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when tos array is empty (kills mutant that removes require(tos.length > 0))", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner approves the AirDropContract to transfer tokens
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Empty tos array and matching empty vs array
    const emptyTos: string[] = [];
    const emptyVs: bigint[] = [];
    
    // This should revert in original due to require(tos.length > 0)
    await expect(
      instance.transfer(await token.getAddress(), emptyTos, emptyVs)
    ).to.be.reverted;
  });
});