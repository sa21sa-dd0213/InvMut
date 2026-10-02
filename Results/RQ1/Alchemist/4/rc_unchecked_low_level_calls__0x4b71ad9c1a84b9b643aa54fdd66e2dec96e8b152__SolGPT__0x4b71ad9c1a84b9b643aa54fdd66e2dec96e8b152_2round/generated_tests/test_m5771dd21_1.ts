import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m5771dd21 test", function () {
  it("should revert when sha256 is used instead of keccak256 for function selector", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the airPort contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("airPort");
    const airPort = await Factory.deploy();
    await airPort.waitForDeployment();

    // Deploy a simple ERC20-like contract that has transferFrom
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const token = await ERC20Factory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve airPort to spend
    await token.mint(owner.address, ethers.parseEther("1000"));
    await token.approve(await airPort.getAddress(), ethers.parseEther("1000"));

    // Create recipient array
    const recipients = [addr1.address];

    // Call transfer - this should revert on the mutant because sha256 produces wrong selector
    await expect(
      airPort.transfer(owner.address, await token.getAddress(), recipients, ethers.parseEther("100"))
    ).to.be.reverted;
  });
});