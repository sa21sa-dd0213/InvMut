import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant kill test", function () {
  it("should succeed with non-empty _tos array on original, but fail on mutant with require(_tos.length < 0)", async function () {
    const [owner, from, recipient] = await ethers.getSigners();
    
    // Deploy the contract (airDrop has no constructor arguments)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create a simple ERC20 mock to call transferFrom on
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const token = await ERC20Factory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to 'from' address and approve the airDrop contract
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await instance.getAddress(), mintAmount);
    
    // Prepare valid transfer parameters
    const tos = [recipient.address];
    const value = ethers.parseEther("1");
    const decimals = 18;
    
    // The call should succeed (not revert) on the original contract
    // but the mutant with require(_tos.length < 0) will always revert
    await expect(
      instance.connect(owner).transfer(
        from.address,
        await token.getAddress(),
        tos,
        value,
        decimals
      )
    ).to.not.be.reverted;
  });
});