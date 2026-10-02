import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m03044ccd - finaliseProposal with <= true", function () {
  it("should revert when calling finaliseProposal on a proposal that is not in finalising state", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DAO (no constructor arguments needed based on the contract code)
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Deploy mock VADER and VAULT contracts (simplified versions that implement required interfaces)
    const VaderFactory = await ethers.getContractFactory("MockVADER");
    const vader = await VaderFactory.deploy();
    await vader.waitForDeployment();
    
    const VaultFactory = await ethers.getContractFactory("MockVAULT");
    const vault = await VaultFactory.deploy();
    await vault.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await vader.getAddress(), ethers.ZeroAddress, await vault.getAddress());
    
    // Create a new grant proposal
    await dao.connect(addr1).newGrantProposal(addr1.address, ethers.parseEther("100"));
    
    // Attempt to finalise the proposal WITHOUT voting (mapPID_finalising is still false)
    // This should revert because the proposal is not in finalising state
    await expect(
      dao.connect(addr1).finaliseProposal(1)
    ).to.be.revertedWith("Must be finalising");
  });
});

// Helper mock contracts to satisfy the interface requirements
contract MockVADER {
    function UTILS() external view returns (address) { return address(0); }
    function DAO() external view returns (address) { return address(0); }
    function emitting() external view returns (bool) { return false; }
    function minting() external view returns (bool) { return false; }
    function secondsPerEra() external view returns (uint) { return 0; }
    function flipEmissions() external {}
    function flipMinting() external {}
    function setParams(uint, uint) external {}
    function setRewardAddress(address) external {}
    function changeUTILS(address) external {}
    function changeDAO(address) external {}
    function purgeDAO() external {}
    function upgrade(uint) external {}
    function redeem() external returns (uint) { return 0; }
    function redeemToMember(address) external returns (uint) { return 0; }
}

contract MockVAULT {
    function setParams(uint, uint, uint) external {}
    function grant(address, uint) external {}
    function deposit(address, uint) external {}
    function depositForMember(address, address, uint) external {}
    function harvest(address) external returns (uint) { return 0; }
    function calcCurrentReward(address, address) external view returns (uint) { return 0; }
    function calcReward(address, address) external view returns (uint) { return 0; }
    function withdraw(address, uint) external returns (uint) { return 0; }
    function totalWeight() external view returns (uint) { return 1000; }
    function reserveUSDV() external view returns (uint) { return 0; }
    function reserveVADER() external view returns (uint) { return 0; }
    function getMemberDeposit(address, address) external view returns (uint) { return 0; }
    function getMemberWeight(address) external view returns (uint) { return 100; }
    function getMemberLastTime(address, address) external view returns (uint) { return 0; }
}