import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant m09a933e9 test", function () {
  it("should detect sha256 replacement by verifying correct function selector is called", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy a simple token contract that tracks transferFrom calls
    const TokenFactory = await ethers.getContractFactory("contracts/TestToken.sol:TestToken");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Deploy the airDrop contract (no constructor args)
    const AirDropFactory = await ethers.getContractFactory("airDrop");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();
    
    // Mint tokens to 'from' and approve airDrop to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(airDrop.target, mintAmount);
    
    // Prepare test parameters
    const recipients = [to.address];
    const transferAmount = ethers.parseEther("10");
    const decimals = 18;
    
    // Call transfer function - in the original it should work, in the mutant it will call wrong selector
    const tx = airDrop.connect(from).transfer(
      from.address,
      token.target,
      recipients,
      transferAmount,
      decimals
    );
    
    // The mutant calls sha256 instead of keccak256, producing a different 4-byte selector
    // This will call a non-existent function on the token contract, causing revert
    await expect(tx).to.be.reverted;
  });
});