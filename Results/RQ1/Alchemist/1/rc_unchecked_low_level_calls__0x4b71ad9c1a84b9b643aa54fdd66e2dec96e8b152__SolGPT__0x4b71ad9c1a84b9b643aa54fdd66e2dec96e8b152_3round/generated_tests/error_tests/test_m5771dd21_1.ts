import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant detection - keccak256 replaced with sha256", function () {
  it("should revert when calling transfer with a valid ERC20 token that implements transferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token that has transferFrom function
    const ERC20Factory = await ethers.getContractFactory("contracts/test/ERC20Mock.sol:ERC20Mock");
    const token = await ERC20Factory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Deploy the airPort contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airPort");
    const airPort = await Factory.deploy();
    await airPort.waitForDeployment();
    
    // Fund addr1 with tokens and approve airPort to spend them
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(airPort.target, ethers.parseEther("100"));
    
    // Call transfer on airPort - this should revert on the mutant because sha256 produces wrong selector
    const recipients = [addr2.address];
    await expect(
      airPort.connect(owner).transfer(
        addr1.address,
        token.target,
        recipients,
        ethers.parseEther("10")
      )
    ).to.be.reverted;
  });
});