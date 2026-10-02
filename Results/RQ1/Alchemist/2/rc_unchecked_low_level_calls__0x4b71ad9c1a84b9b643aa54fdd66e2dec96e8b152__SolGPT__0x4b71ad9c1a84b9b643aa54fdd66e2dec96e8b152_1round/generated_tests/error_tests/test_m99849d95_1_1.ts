import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m99849d95 test", function () {
  it("should return true on successful transferFrom calls, but mutant returns false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20 token that the airPort can call transferFrom on
    const ERC20Factory = await ethers.getContractFactory("contracts/test/TestERC20.sol:TestERC20");
    const token = await ERC20Factory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Deploy the airPort contract (no constructor arguments needed)
    const AirPortFactory = await ethers.getContractFactory("airPort");
    const airport = await AirPortFactory.deploy();
    await airport.waitForDeployment();

    // Setup: mint tokens to owner, approve airport to transfer
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(await airport.getAddress(), mintAmount);

    // Create recipients array
    const recipients = [addr1.address, addr2.address];
    const transferAmount = ethers.parseEther("10");

    // Call transfer function and capture return value
    const tx = await airport.connect(owner).transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      transferAmount
    );
    const receipt = await tx.wait();

    // For ethers v6, we need to get the return value differently
    // The function returns a bool, so we decode the return data
    const iface = new ethers.Interface(["function transfer(address,address,address[],uint256) returns (bool)"]);
    const decoded = iface.decodeFunctionResult("transfer", receipt.logs[0].data);

    // The mutant removes "return true", so it will return false (default)
    // Original returns true on success
    expect(decoded[0]).to.equal(true);
  });
});