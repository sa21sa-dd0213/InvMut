import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant mb8b41337", function () {
  it("should revert when tos array is empty (original behavior) - mutant fails this test", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the AirDropContract
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create a mock ERC20 token that supports transferFrom for testing
    const TokenFactory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Fund owner with tokens and approve the AirDropContract to spend them
    await token.approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Test with empty tos array and non-empty vs array - should revert on original but not on mutant
    const emptyTos: string[] = [];
    const nonEmptyVs: bigint[] = [ethers.parseEther("1")];
    
    // This should revert on the original contract due to require(tos.length > 0)
    // The mutant removes this check, so it would not revert, thus killing the mutant
    await expect(
      instance.connect(owner).transfer(
        await token.getAddress(),
        emptyTos,
        nonEmptyVs
      )
    ).to.be.reverted;
  });
});